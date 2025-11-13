declare module "newsdataapi" {
	interface NewsDataApiClientConfig {
		apikey: string;
	}

	export default class NewsDataApiClient {
		constructor(config: NewsDataApiClientConfig);
		news_api(params: Record<string, any>): Promise<any>;
	}
}

